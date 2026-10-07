import { useUser, SignInButton } from '@clerk/clerk-react';
import { Button, EmptyNote } from './ui.jsx';

export default function AuthGuard({ children, roles }) {
  const { isSignedIn, isLoaded, user } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-16 sm:px-8">
        <div className="mx-auto max-w-md">
          <EmptyNote title="Sign in to view this page.">
            <SignInButton mode="modal">
              <Button variant="primary" className="mt-3">Sign in</Button>
            </SignInButton>
          </EmptyNote>
        </div>
      </main>
    );
  }

  if (roles && !roles.includes(user?.publicMetadata?.role)) {
    return (
      <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-16 sm:px-8">
        <div className="mx-auto max-w-md">
          <EmptyNote title="You don't have access to this page." />
        </div>
      </main>
    );
  }

  return children;
}
