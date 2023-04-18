import './globals.css'

export const metadata = {
  title: 'Foveated Metamers Browser',
  description: 'Search model metamers from Foveated metamers of the early visual system, Broderick et al. 2022',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
