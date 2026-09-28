'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '@/schema/user-schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateProfileAction } from '@/lib/actions/auth';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
    },
  });

  const { execute, isExecuting } = useAction(updateProfileAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(data.message);
        router.refresh();
      } else {
        toast.error(data?.message || 'Failed to update profile');
      }
    },
    onError: ({ error }) => {
      console.error('Profile update error:', error);
      toast.error('An error occurred while updating profile');
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    execute(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} disabled={isExecuting} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" {...field} disabled={isExecuting} />
              </FormControl>
              <FormDescription>
                We&apos;ll use this to contact you if you need to reset your password.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isExecuting}>
            {isExecuting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
