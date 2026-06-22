import { useUser, SignInButton } from '@clerk/clerk-react';
import { Button } from './ui.jsx';

export default function AuthGuard({ children, roles }) {
  const { isSignedIn, isLoaded, user } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-sm text-[var(--muted-fg)]">Sign in to view this page.</p>
        <SignInButton mode="modal">
          <Button variant="primary">Sign in</Button>
        </SignInButton>
      </div>
    );
  }

  if (roles && !roles.includes(user?.publicMetadata?.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-sm text-[var(--muted-fg)]">You don't have access to this page.</p>
      </div>
    );
  }

  return children;
}
