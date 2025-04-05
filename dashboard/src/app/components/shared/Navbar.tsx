"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/app/utils/supabaseClient';

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showTabs?: boolean;
  tabs?: Array<{
    id: string;
    label: string;
  }>;
}

const Navbar = ({ activeTab, onTabChange, showTabs = true, tabs = [] }: NavbarProps) => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="bg-green-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center">
          {showTabs && (
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`py-4 px-6 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-white border-b-2 border-white'
                      : 'text-green-100 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 
                     transition-colors duration-200 flex items-center space-x-2"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" 
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414 0L4 7.414V15h12V7.414z" 
                    clipRule="evenodd" 
              />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;