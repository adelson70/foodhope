import { Outlet } from 'react-router-dom';

export function MobileAppLayout() {
  return (
    <div className="min-h-screen flex justify-center bg-secondary-900">
      <div className="w-full max-w-md bg-secondary-500 relative shadow-2xl flex flex-col min-h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}