// pages/index.tsx

import dynamic from 'next/dynamic';
import { NextPage } from 'next';

interface HomeProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// Dynamically import GotchiBankingServices component without SSR
const GotchiBankingServices = dynamic(() => import('../components/GotchiBankingServices'), { ssr: false });

const Home: NextPage<HomeProps> = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <div className="App">
      <GotchiBankingServices isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
    </div>
  );
};

export default Home;
