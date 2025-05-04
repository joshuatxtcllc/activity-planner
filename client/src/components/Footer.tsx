const Footer = () => {
  return (
    <footer className="bg-dark-surface py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 mb-4 md:mb-0">&copy; 2025 Edge Class Entertainment</p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-accent transition-colors duration-200">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-accent transition-colors duration-200">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-accent transition-colors duration-200">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
