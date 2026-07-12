import Image from 'next/image'

interface TFDLogoProps {
  size?: number
  className?: string
}

export function TFDLogo({ size = 32 }: TFDLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="TheFundedDiaries"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}