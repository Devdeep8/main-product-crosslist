"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginValues } from "./schemas";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // <-- import router

interface LoginFormProps {
  // A callback function to handle the actual login logic.
  // It takes the validated form data and is expected to be async.
  onSubmit: (
    values: LoginValues
  ) => Promise<{ error?: string; success?: string }>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const router = useRouter(); // <-- initialize router

  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleFormSubmit = (values: LoginValues) => {
    startTransition(() => {
      onSubmit(values)
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
          }
          if (data.success) {
            toast.success(data.success);
            setTimeout(() => {
              router.push("/home");
            }, 1500); // 1.5 seconds
          }
        })
        .catch(() => {
          toast.error("Something went wrong. Please try again.");
        });
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-6"
        >
          <div className="space-y-6">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <FormControl>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        disabled={isPending}
                        className="peer h-14 px-4 pt-6 pb-2 bg-gray-100 border-0 rounded-lg text-base placeholder-transparent focus:bg-white focus:ring-2 focus:ring-primary"
                        placeholder=""
                      />
                    </FormControl>
                    <label
                      htmlFor="email"
                      className="absolute left-4 top-2 text-xs text-gray-500 transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
                    >
                      Email address
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="relative w-full">
                    <FormControl>
                      <div className="relative w-full">
                        <Input
                          {...field}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          disabled={isPending}
                          className="peer h-14 w-full px-4 pt-6 pb-2 bg-gray-100 border border-gray-300 rounded-lg text-base placeholder-transparent focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                          placeholder=" " // Important: space only
                        />
                        {/* Floating Label */}
                        <label
                          htmlFor="password"
                          className="absolute left-4 top-2 text-xs text-gray-500 transition-all duration-200
                     peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                     peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
                        >
                          Password
                        </label>
                        {/* Toggle button (eye) */}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link
              href="/forget-password"
              className="text-sm text-gray-600 hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Error and Success Messages */}
          {/* Messages are now handled by toast notifications */}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            disabled={isPending}
          >
            {isPending && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}
            Log In
          </Button>
        </form>
      </Form>
    </div>
  );
}
