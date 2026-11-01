export const defaultRotationSpeed = 25
export const rotationDegreesPerBeat = 50

export function tempoRotationSpeed(bpm: number | null) {
  return bpm !== null && Number.isFinite(bpm) && bpm >= 60 && bpm <= 180
    ? bpm / 60 * rotationDegreesPerBeat : defaultRotationSpeed
}

export function smoothRotationSpeed(current: number, target: number, elapsed: number) {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, Math.min(elapsed, 50)) / 450))
}

export function createTempoDetector() {
  const step = 20, capacity = 400
  const envelope = new Float64Array(capacity)
  let count = 0, cursor = 0, previousTime: number | null = null, previousEnergy = 0
  let sampleTime = 0, sampledEnergy = 0, smoothedOnset = 0, lastPulse = 0, lastSound = 0, lastAnalysis = 0, lastReliable = 0
  let previousSpectrum = new Float64Array(0), fluxAverage = .5
  let estimate: number | null = null, pending = 0, confirmations = 0

  function reset() {
    count = 0; cursor = 0; previousTime = null; previousEnergy = 0
    sampleTime = 0; sampledEnergy = 0; smoothedOnset = 0; lastPulse = 0; lastSound = 0; lastAnalysis = 0; lastReliable = 0
    estimate = null; pending = 0; confirmations = 0
    previousSpectrum.fill(0); fluxAverage = .5
    envelope.fill(0)
  }

  function analyse(): number | null {
    const size = Math.min(count, 200)
    if (size < 125) return null
    const start = (cursor - size + capacity) % capacity
    const value = (index: number) => envelope[(start + index) % capacity]
    let mean = 0
    for (let i = 0; i < size; i++) mean += value(i)
    mean /= size
    const scores = new Float64Array(53)
    for (let lag = 15; lag <= 51; lag++) {
      let cross = 0, left = 0, right = 0
      for (let i = lag; i < size; i++) {
        const a = value(i) - mean, b = value(i - lag) - mean
        cross += a * b; left += a * a; right += b * b
      }
      scores[lag] = left * right > 1e-10 ? cross / Math.sqrt(left * right) : 0
    }
    let best = 0
    for (let lag = 17; lag <= 50; lag++) {
      if (size / lag < 3 || scores[lag] < .45 || scores[lag] < scores[lag - 1] || scores[lag] < scores[lag + 1]) continue
      // Prefer the shorter repeating period when its correlation is equally strong.
      if (!best || scores[lag] > scores[best] + .04) best = lag
    }
    if (!best) return null
    const longer = best
    for (let lag = Math.max(17, Math.floor(longer / 2) - 1); lag <= Math.ceil(longer / 2) + 1; lag++) {
      if (scores[lag] >= .5 && scores[lag] >= scores[longer] * .8 && scores[lag] >= scores[lag - 1] && scores[lag] >= scores[lag + 1]) {
        best = lag; break
      }
    }
    const denominator = scores[best - 1] - 2 * scores[best] + scores[best + 1]
    const offset = denominator ? Math.max(-.5, Math.min(.5, .5 * (scores[best - 1] - scores[best + 1]) / denominator)) : 0
    const bpm = 60000 / ((best + offset) * step)
    return bpm >= 60 && bpm <= 180 ? bpm : null
  }

  return {
    update(time: number, rms: number, bass: number, active: boolean, spectrum?: ArrayLike<number>, sampleRate = 48000): number | null {
      if (!active || !Number.isFinite(time) || !Number.isFinite(rms) || !Number.isFinite(bass)) { reset(); return null }
      const energy = Math.log(Math.max(1e-7, rms)) + Math.max(0, bass) * .6
      if (previousTime !== null && (time < previousTime || time - previousTime > 250)) reset()
      if (previousTime === null) {
        previousTime = sampleTime = lastPulse = lastSound = lastAnalysis = lastReliable = time
        previousEnergy = sampledEnergy = energy
        if (spectrum) previousSpectrum = Float64Array.from(spectrum)
        return estimate
      }
      if (rms >= .0003) lastSound = time
      if (time - lastSound > 1600) { reset(); return null }
      let flux = 0
      if (spectrum?.length && Number.isFinite(sampleRate) && sampleRate > 0) {
        if (previousSpectrum.length !== spectrum.length) previousSpectrum = Float64Array.from(spectrum)
        const limits = [40, 220, 2000, 8000], weights = [.65, .25, .1]
        for (let band = 0; band < 3; band++) {
          const begin = Math.max(1, Math.floor(limits[band] / (sampleRate / 2) * spectrum.length))
          const end = Math.min(spectrum.length, Math.ceil(limits[band + 1] / (sampleRate / 2) * spectrum.length))
          let rise = 0
          for (let bin = begin; bin < end; bin++) {
            const value = Number.isFinite(spectrum[bin]) ? Math.max(0, Math.min(255, spectrum[bin])) : 0
            rise += Math.max(0, value - previousSpectrum[bin])
          }
          flux += weights[band] * rise / Math.max(1, end - begin)
        }
        for (let bin = 0; bin < spectrum.length; bin++) previousSpectrum[bin] = Number.isFinite(spectrum[bin]) ? spectrum[bin] : 0
        flux *= step / Math.max(1, time - previousTime)
        fluxAverage += (flux - fluxAverage) * .03
        flux = Math.min(3, flux / Math.max(.5, fluxAverage)) * .15
      }
      while (sampleTime + step <= time) {
        sampleTime += step
        const fraction = time === previousTime ? 1 : (sampleTime - previousTime) / (time - previousTime)
        const next = previousEnergy + (energy - previousEnergy) * fraction
        const onset = Math.min(2, Math.max(0, next - sampledEnergy)) + flux
        sampledEnergy = next
        if (onset > .04) lastPulse = sampleTime
        smoothedOnset = smoothedOnset * .75 + onset * .25
        envelope[cursor] = smoothedOnset
        cursor = (cursor + 1) % capacity
        count = Math.min(capacity, count + 1)
      }
      previousTime = time; previousEnergy = energy
      if (time - lastPulse > 2200) { reset(); return null }
      if (time - lastAnalysis >= 250) {
        lastAnalysis = time
        const candidate = analyse()
        if (candidate === null) {
          pending = 0; confirmations = 0
          if (time - lastReliable > 1250) estimate = null
        }
        else {
          confirmations = pending && Math.abs(candidate - pending) / pending < .05 ? confirmations + 1 : 1
          pending = candidate
          if (confirmations >= 2) {
            lastReliable = time
            estimate = estimate !== null && Math.abs(candidate - estimate) / estimate < .08
            ? estimate * .5 + candidate * .5 : candidate
          }
        }
      }
      return estimate
    },
    reset,
  }
}
