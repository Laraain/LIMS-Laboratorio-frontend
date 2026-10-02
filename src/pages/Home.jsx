import { useEffect } from 'react';
import './Home.css';

function Home() {
  useEffect(() => {
    document.title = 'LIMS Laboratorio — Sistema de gestión para laboratorio bioquímico';
  }, []);

  return (
    <main id="contenido">
      <section className="lims-hero py-5">
        <div className="container px-3 px-lg-4">
          <h1 className="text-white">LIMS Laboratorio</h1>
        </div>
      </section>
    </main>
  );
}

export default Home;
