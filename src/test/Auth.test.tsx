import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from '../pages/Auth';

// Mock supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
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
  }
}));

describe('Auth Page OAuth Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Google sign in button triggers Google OAuth', async () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );
    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(googleButton);
    // Retrieve the mock from the module
    const { supabase } = await import('@/lib/supabaseClient');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    );
  });

  test('GitHub sign in button triggers GitHub OAuth', async () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );
    const githubButton = screen.getByRole('button', { name: /continue with github/i });
    fireEvent.click(githubButton);
    const { supabase } = await import('@/lib/supabaseClient');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github' })
    );
  });
});