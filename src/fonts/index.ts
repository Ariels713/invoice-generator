import localFont from 'next/font/local'

export const degular = localFont({
  src: [
    {
      path: '../../public/degular/Degular_44534.otf', // Regular
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/degular/Degular_44535.otf', // Medium
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/degular/Degular_44536.otf', // Bold
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-degular',
})

export const degularDisplay = localFont({
  src: '../../public/degular/Degular_44526.otf', // Medium weight
  variable: '--font-degular-display',
})
