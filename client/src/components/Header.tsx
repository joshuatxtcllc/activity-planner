import { Link } from "wouter";
import { Home, Lightbulb, Calendar, User } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-dark-surface shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="text-2xl font-bold">
            <span className="mr-1 text-accent">Edge</span>
            <span className="text-primary">Class</span>
            <span className="ml-1 text-accent">Entertainment</span>
          </div>
        </div>
        
        <nav className="w-full md:w-auto">
          <ul className="flex space-x-1 md:space-x-8 justify-center">
            <li>
              <Link href="/">
                <div className="nav-item active px-3 py-2 text-light hover:text-accent transition-colors duration-200 flex items-center relative cursor-pointer after:content-[''] after:absolute after:w-full after:h-0.5 after:bg-accent after:bottom-[-4px] after:left-0">
                  <Home className="h-5 w-5 mr-1" />
                  Home
                </div>
              </Link>
            </li>
            <li>
              <Link href="/ideas">
                <div className="nav-item px-3 py-2 text-light hover:text-accent transition-colors duration-200 flex items-center relative cursor-pointer after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-accent after:bottom-[-4px] after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Lightbulb className="h-5 w-5 mr-1" />
                  Ideas
                </div>
              </Link>
            </li>
            <li>
              <Link href="/calendar">
                <div className="nav-item px-3 py-2 text-light hover:text-accent transition-colors duration-200 flex items-center relative cursor-pointer after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-accent after:bottom-[-4px] after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Calendar className="h-5 w-5 mr-1" />
                  Calendar
                </div>
              </Link>
            </li>
            <li>
              <Link href="/profile">
                <div className="nav-item px-3 py-2 text-light hover:text-accent transition-colors duration-200 flex items-center relative cursor-pointer after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-accent after:bottom-[-4px] after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <User className="h-5 w-5 mr-1" />
                  Profile
                </div>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
