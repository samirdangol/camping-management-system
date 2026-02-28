import { Tent } from "lucide-react";

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <div className="flex items-center gap-2 font-semibold text-green-700">
            <Tent className="h-5 w-5" />
            <span>Camp Planner</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
    </div>
  );
}
