// src/pages/HomePage.tsx

import Layout from '../components/Layout';

export default function HomePage() {
  return (
    <Layout title="Home">
      <div className="flex justify-center items-center h-full">
        <img src="/pdt-logo-gray.png" alt="PdT Logo" className="w-48 h-auto opacity-60" />
      </div>
    </Layout>
  );
}
