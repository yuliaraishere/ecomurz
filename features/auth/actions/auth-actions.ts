'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AuthActionResult } from '../types';

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirectTo') as string)?.trim() || '';

  if (!email || !password) {
    return {
      success: false,
      error: 'INVALID_CREDENTIALS',
      fieldErrors: {
        ...(!email ? { email: 'EMAIL_REQUIRED' } : {}),
        ...(!password ? { password: 'PASSWORD_REQUIRED' } : {}),
      },
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath('/', 'layout');
    return {
      success: true,
      redirectTo: redirectTo || undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'UNEXPECTED_ERROR',
    };
  }
}

export async function registerAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const fullName = (formData.get('fullName') as string)?.trim() || '';
  const redirectTo = (formData.get('redirectTo') as string)?.trim() || '';

  const fieldErrors: Record<string, string> = {};

  if (!email) {
    fieldErrors.email = 'EMAIL_REQUIRED';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    fieldErrors.email = 'EMAIL_INVALID';
  }

  if (!password) {
    fieldErrors.password = 'PASSWORD_REQUIRED';
  } else if (password.length < 6) {
    fieldErrors.password = 'PASSWORD_TOO_SHORT';
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'PASSWORDS_DO_NOT_MATCH';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
      error: 'VALIDATION_FAILED',
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath('/', 'layout');

    // If confirmation is required, data.session is null and data.user is created
    const requiresEmailConfirmation = !data.session && !!data.user;

    return {
      success: true,
      redirectTo: redirectTo || undefined,
      requiresEmailConfirmation,
      email,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'UNEXPECTED_ERROR',
    };
  }
}

export async function logoutAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
