// import logo from './logo.svg';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import BaseComponent from './view/Base';
import WagmiPage from './view/WagmiPage';

function App() {
  return (
    <Router>
      <div className="App">
        {/* 导航栏 */}
        <nav className="nav">
          <Link to="/" className="nav-link">Ethers版本</Link>
          <Link to="/wagmi" className="nav-link">Wagmi版本</Link>
        </nav>
        
        {/* 路由配置 */}
        <Routes>
          <Route path="/" element={<BaseComponent />} />
          <Route path="/wagmi" element={<WagmiPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
