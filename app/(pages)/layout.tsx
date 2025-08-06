import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HomeHeader } from '@/components/layout-module/header'
import { auth } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // Unauthenticated – redirect to sign-in page
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Please sign in</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to access the dashboard.</p>
          <Button asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Authenticated – render dashboard
  return (
    <div> 
      <HomeHeader session={session} />
      <main>{children}</main>
    </div>
  )
}
