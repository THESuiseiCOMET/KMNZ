import type { RefObject } from 'react'
import type { ShowcasePhase } from '../lib/showcase'
import classic from '../assets/showcase/LITALIZ.jpg'
import modern from '../assets/images/kmnz2.avif'
import logo from '../assets/images/KMNZLOGOW.webp'
import ink from '../assets/showcase/ink-sticker.svg'
import paperTexture from '../assets/showcase/paper-texture.png'
import lita from '../assets/showcase/LITA-stick.png'
import nero from '../assets/showcase/NERO-stick.png'
import tina from '../assets/showcase/TINA-stick.png'
import arrow from '../assets/icons/arrow-up-right.svg'
import '../showcase.css'

export const showcaseArtwork = { classic, modern, logo, ink, paperTexture, stickers: { lita, nero, tina } }

const leftTear = 'M777 -8 C781 26 774 48 780 78 L777 97 781 107 776 124 C774 156 766 178 766 206 L761 217 765 225 760 241 C756 271 754 296 748 323 L751 336 745 349 747 360 C740 395 736 421 729 449 L732 458 727 469 731 480 C728 508 719 526 721 553 L716 567 720 579 715 591 C710 622 704 645 703 671 L698 680 702 691 697 703 C695 731 685 750 687 776 L682 789 686 800 679 817 C677 850 677 877 672 903 L678 918 675 929 680 951'
const rightTear = 'M953 -8 C965 22 962 43 954 65 L957 79 949 91 952 103 C944 133 934 153 934 183 L929 197 933 210 927 222 C923 252 918 277 916 300 L920 312 912 326 915 340 C908 373 905 396 898 420 L902 434 895 444 899 457 C892 480 885 501 886 526 L882 538 888 552 884 564 C890 597 899 617 903 643 L900 655 908 666 906 679 C916 708 922 729 930 749 L927 762 936 774 934 786 C946 814 958 835 970 858 L968 871 980 883 978 894 C989 917 999 935 1010 951'
const seamShape = leftTear + ' L1010 951 C985 916 969 881 952 846 L948 826 936 805 935 786 929 766 930 749 C910 703 898 662 889 615 L884 586 886 564 882 538 886 526 C881 500 897 460 898 420 L907 386 915 340 912 326 916 300 C919 255 928 216 934 183 L940 143 952 103 949 91 954 65 C964 31 962 11 953 -8 Z'
const bottomTear = 'M-8 800 L31 807 61 804 91 811 126 808 159 813 194 811 231 817 266 813 302 817 338 812 375 817 414 815 451 820 488 816 527 823 565 821 604 828 641 826 677 833 715 829 752 835 789 833 827 839 865 836 904 842 944 840 981 848 1017 852 1054 866 1088 871 1120 886 1158 876 1194 880 1230 866 1266 866 1302 857 1338 861 1376 853 1413 857 1453 850 1491 846 1526 838 1564 836 1604 823 1640 820 1680 810 V951 H-8 Z'

export default function Showcase({ phase, onEnter, enterRef }: {
  phase: ShowcasePhase; onEnter: () => void; enterRef: RefObject<HTMLButtonElement | null>
}) {
  if (phase === 'console') return null
  const busy = phase !== 'showcase'
  return <section className="showcase" data-phase={phase} aria-label="KMNZ SHOWCASE" aria-busy={busy} inert={busy}>
    <svg className="showcase-masks" width="0" height="0" aria-hidden="true" focusable="false"><defs>
      <clipPath id="showcase-classic-cut" clipPathUnits="objectBoundingBox"><path transform="scale(.0005980861 .0010626993)" d={'M-8 -8 H777 ' + leftTear.slice(leftTear.indexOf('C')) + ' H-8 Z'} /></clipPath>
      <clipPath id="showcase-new-cut" clipPathUnits="objectBoundingBox"><path transform="scale(.0005980861 .0010626993)" d={rightTear + ' H1680 V-8 Z'} /></clipPath>
      <clipPath id="showcase-classic-mobile-cut" clipPathUnits="objectBoundingBox"><path d="M0 0H1V.446C.88 .438 .82 .451 .74 .442L.71 .447 .69 .442C.58 .451 .51 .44 .43 .448L.4 .443 .37 .448C.25 .439 .15 .451 0 .444Z" /></clipPath>
      <clipPath id="showcase-new-mobile-cut" clipPathUnits="objectBoundingBox"><path d="M0 .557C.13 .564 .19 .551 .29 .559L.32 .554 .35 .56C.46 .552 .55 .566 .64 .557L.68 .562 .71 .556C.81 .563 .89 .552 1 .559V1H0Z" /></clipPath>
    </defs></svg>
    <div className="showcase-paper" aria-hidden="true" />
    <figure className="showcase-poster showcase-classic" style={{ clipPath: 'var(--showcase-classic-clip)' }}>
      <img src={classic} alt="LITA 与 LIZ，经典时期主视觉" fetchPriority="high" decoding="async" draggable={false} />

    </figure>
    <figure className="showcase-poster showcase-new" style={{ clipPath: 'var(--showcase-new-clip)' }}>
      <img src={modern} alt="LITA、NERO 与 TINA，新时期主视觉" fetchPriority="high" decoding="async" draggable={false} />

    </figure>
    <svg className="showcase-seam" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="showcase-paper-cut"><path d={seamShape} /></clipPath>
        <filter id="showcase-paper-fiber" x="-15%" y="-2%" width="130%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".12" numOctaves="2" seed="9" result="fiber" /><feDisplacementMap in="SourceGraphic" in2="fiber" scale="3" xChannelSelector="R" yChannelSelector="G" /></filter>
      </defs>
      <path d={seamShape} fill="#f1f0eb" />
      <image href={paperTexture} width="1672" height="941" clipPath="url(#showcase-paper-cut)" preserveAspectRatio="none" />
      <path className="showcase-paper-edge" d={leftTear} filter="url(#showcase-paper-fiber)" />
      <path className="showcase-paper-edge showcase-paper-edge-right" d={rightTear} filter="url(#showcase-paper-fiber)" />
    </svg>
    <svg className="showcase-bottom" viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs><clipPath id="showcase-bottom-cut"><path d={bottomTear} /></clipPath></defs>
      <path d={bottomTear} fill="#1b1b1c" />
      <image href={paperTexture} width="1672" height="941" preserveAspectRatio="none" clipPath="url(#showcase-bottom-cut)" />
      <path d={bottomTear} fill="none" stroke="#f9f7ef" strokeWidth="3" filter="url(#showcase-paper-fiber)" />
    </svg>
    <div className="showcase-center">
      <div className="showcase-logo-sticker">
        <img className="showcase-ink" src={ink} alt="" draggable={false} />
        <img className="showcase-logo" src={logo} alt="KMNZ" draggable={false} />
      </div>
      <button ref={enterRef} type="button" className="showcase-enter" onClick={onEnter} disabled={busy} aria-label="ENTER，进入 KMNZ 网站">
        <span>ENTER</span><img src={arrow} alt="" aria-hidden="true" />
      </button>
    </div>
    <div className="showcase-stickers" aria-hidden="true">
      {Object.entries(showcaseArtwork.stickers).map(([name, src]) => <span key={name} className={'showcase-sticker showcase-sticker-' + name}><img src={src} alt="" draggable={false} /></span>)}
    </div>
  </section>
}
