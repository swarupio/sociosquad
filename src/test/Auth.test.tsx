import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from '../pages/Auth';

// Mock supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ 
        data: { 
          subscription: { 
            unsubscribe: vi.fn() 
          } 
        } 
      })),
    },
  }
}));

describe('Auth Page OAuth Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Google sign in button triggers Google OAuth', async () => {
    render(<Auth />);
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    await userEvent.click(googleButton);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    );
  });

  test('GitHub sign in button triggers GitHub OAuth', async () => {
    render(<Auth />);
    const githubButton = screen.getByRole('button', { name: /continue with github/i });
    await userEvent.click(githubButton);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github' })
    );
  });
});