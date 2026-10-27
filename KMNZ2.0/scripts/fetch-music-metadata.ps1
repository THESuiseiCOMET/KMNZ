$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$response = $null
$stream = $null
try {
    $inputRequest = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $uri = [Uri]$inputRequest.url
    if ($uri.Scheme -ne 'https') { throw 'HTTPS required' }
    $request = [System.Net.WebRequest]::Create($uri)
    $request.Method = 'GET'
    $request.Timeout = 12000
    $request.ReadWriteTimeout = 12000
    foreach ($header in $inputRequest.headers.PSObject.Properties) {
        if ($header.Name -eq 'Accept') { $request.Accept = [string]$header.Value }
        else { $request.Headers[$header.Name] = [string]$header.Value }
    }
    $response = $request.GetResponse()
    $status = [int]$response.StatusCode
    $contentType = [string]$response.ContentType
    $limit = if ($contentType.StartsWith('image/')) { 65536 } else { 1048576 }
    $stream = $response.GetResponseStream()
    $buffer = New-Object byte[] $limit
    $offset = 0
    while ($offset -lt $limit) {
        $count = $stream.Read($buffer, $offset, $limit - $offset)
        if ($count -eq 0) { break }
        $offset += $count
    }
    @{status=$status; contentType=$contentType; body=[Convert]::ToBase64String($buffer,0,$offset)} | ConvertTo-Json -Compress
} catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    @{status=$status; contentType='application/json'; body=''} | ConvertTo-Json -Compress
} finally {
    if ($stream) { $stream.Dispose() }
    if ($response) { $response.Dispose() }
}
