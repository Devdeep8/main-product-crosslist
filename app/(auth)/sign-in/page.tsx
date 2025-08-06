import {
  Card,
  CardContent,

} from "@/components/ui/card";
import { LoginForm } from "@/components/auth-module/LoginForm";
import { login } from "@/actions/login";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Logo */}
      <div className="pt-8 pb-12">
        <div className="flex justify-start px-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Container */}
      <div className="flex items-start justify-center px-4">
        <div className="w-full max-w-md">
          {/* Title Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">
              Log In to CrossList
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              New Here?{" "}
              <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
                Create an account
              </Link>
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardContent className="p-8">
              <LoginForm onSubmit={login} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat Support Button */}
      <div className="fixed bottom-6 right-6">
        <button className="w-14 h-14 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-colors">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}