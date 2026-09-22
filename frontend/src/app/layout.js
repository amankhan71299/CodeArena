import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'CodeArena',
  description: 'Online coding platform and judge',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200 min-h-screen flex flex-col">
        <AuthProvider>
          <SocketProvider>
            <Navbar />
            <main className="flex-grow container mx-auto p-4">
              {children}
            </main>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
