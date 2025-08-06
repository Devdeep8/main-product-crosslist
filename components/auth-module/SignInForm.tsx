"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, RegisterValue } from "./schemas";
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

interface SignupFormProps {
  onSubmit: (
    values: RegisterValue
  ) => Promise<{ error?: string; success?: string }>;
}

export function SignupForm({ onSubmit }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterValue>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const handleSubmit = (values: RegisterValue) => {
    startTransition(() => {
      onSubmit(values)
        .then((res) => {
          if (res.error) toast.error(res.error);
          if (res.success) toast.success(res.success);
        })
        .catch(() => toast.error("Something went wrong."));
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          {/* Full Name */}
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <FormControl>
                    <Input
                      {...field}
                      id="fullName"
                      type="text"
                      disabled={isPending}
                      placeholder=" "
                      className="peer h-14 w-full px-4 pt-6 pb-2 bg-gray-100 border border-gray-300 rounded-lg text-base placeholder-transparent focus:bg-white focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <label
                    htmlFor="fullName"
                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all duration-200
                      peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                      peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
                  >
                    Full Name
                  </label>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Email */}
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
                      placeholder=" "
                      className="peer h-14 w-full px-4 pt-6 pb-2 bg-gray-100 border border-gray-300 rounded-lg text-base placeholder-transparent focus:bg-white focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <label
                    htmlFor="email"
                    className="absolute left-4 top-2 text-xs text-gray-500 transition-all duration-200
                      peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                      peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
                  >
                    Email Address
                  </label>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Password */}
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
                        placeholder=" "
                        className="peer h-14 w-full px-4 pt-6 pb-2 bg-gray-100 border border-gray-300 rounded-lg text-base placeholder-transparent focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                      <label
                        htmlFor="password"
                        className="absolute left-4 top-2 text-xs text-gray-500 transition-all duration-200
                          peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                          peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            disabled={isPending}
          >
            {isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Sign Up
          </Button>
        </form>
      </Form>
    </div>
  );
}
