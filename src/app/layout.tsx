import 'src/lib/globals.css'

export const metadata = {
  title: 'Foveated Metamers Browser',
  description: 'Search model metamers from Foveated metamers of the early visual system, Broderick et al. 2023',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-full bg-gamma-50">{children}</body>
    </html>
  )
}
