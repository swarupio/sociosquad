import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from '../pages/Auth';

// Mock supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
      getUser: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      })),
    },
    from: vi.fn(() => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  }
}));

const renderAuth = (route = '/auth') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Auth />
    </MemoryRouter>
  );

describe('Auth Page OAuth Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Google sign in button triggers Google OAuth with /auth/callback redirect', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    const { supabase } = await import('@/lib/supabaseClient');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      })
    );
  });

  test('GitHub sign in button triggers GitHub OAuth', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /continue with github/i }));
    const { supabase } = await import('@/lib/supabaseClient');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github' })
    );
  });

  test('unsafe next param is not forwarded to the OAuth redirect', async () => {
    renderAuth('/auth?next=//evil.com');
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    const { supabase } = await import('@/lib/supabaseClient');
    const call = (supabase.auth.signInWithOAuth as any).mock.calls[0][0];
    expect(call.options.redirectTo).not.toContain('evil.com');
  });

  test('safe next param is forwarded to the OAuth redirect', async () => {
    renderAuth('/auth?next=/profile');
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    const { supabase } = await import('@/lib/supabaseClient');
    const call = (supabase.auth.signInWithOAuth as any).mock.calls[0][0];
    expect(call.options.redirectTo).toContain('next=%2Fprofile');
  });

  test('Forgot Password calls resetPasswordForEmail with a valid email', async () => {
    renderAuth();
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'user@example.org' } });
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    const { supabase } = await import('@/lib/supabaseClient');
    await waitFor(() =>
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.org', expect.anything())
    );
  });

  test('Forgot Password without an email does not call the API', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    const { supabase } = await import('@/lib/supabaseClient');
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
