import { useState } from 'react';
// lucide-react 아이콘 임포트
import { 
  Gamepad2, 
  Menu, 
  Facebook, 
  Instagram, 
  Github, 
  MessageSquare // Discord 아이콘 대용
} from 'lucide-react';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  // style.css의 .mainHeader, .headerMenu, .headerLinks 등 변환
  return (
    <nav className="flex flex-wrap items-center justify-between bg-black p-3 font-header text-white">
      {/* 로고 */}
      <a href="#" className="text-2xl font-bold text-white transition-colors duration-300 hover:text-red-500">
        {/* FaGamepad -> Gamepad2 */}
        <Gamepad2 className="inline-block" /> Text RPG
      </a>

      {/* 모바일 토글 버튼 (style.css의 .header_toggleBtn) */}
      <button
        className="block text-2xl text-white transition-colors duration-300 hover:text-red-500 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* FaBars -> Menu */}
        <Menu />
      </button>

      {/* 메뉴 (style.css의 .headerMenu) */}
      <div className={`w-full md:flex md:w-auto md:items-center ${isOpen ? 'block' : 'hidden'}`}>
        <ul className="flex list-none flex-col items-center p-0 md:flex-row">
          <li className="w-full p-2 text-center md:w-auto">
            <a href="https://github.com/jimmy010617" target="_blank" rel="noopener noreferrer" className="block text-white transition-colors duration-300 hover:text-red-500">
              GitHub
            </a>
          </li>
          <li className="w-full p-2 text-center md:w-auto">
            <a href="#" className="block text-white transition-colors duration-300 hover:text-red-500">
              About Us
            </a>
          </li>
        </ul>

        {/* 링크 (style.css의 .headerLinks) */}
        <ul className="flex w-full list-none justify-center p-0 md:w-auto md:justify-start">
          <li className="p-2 text-white transition-colors duration-300 hover:text-red-500">
            {/* FaFacebook -> Facebook */}
            <Facebook />
          </li>
          <li className="p-2 text-white transition-colors duration-300 hover:text-red-500">
            {/* FaInstagram -> Instagram */}
            <Instagram />
          </li>
          <li className="p-2 text-white transition-colors duration-300 hover:text-red-500">
            {/* FaGithub -> Github */}
            <Github />
          </li>
          <li className="p-2 text-white transition-colors duration-300 hover:text-red-500">
            {/* FaDiscord -> MessageSquare (대체) */}
            <MessageSquare />
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Header;