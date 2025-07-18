import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const MainLayout: React.FC = () => {
    return (
        <>
            <Navbar />
            <main style={{ padding: '1rem' }}>
                <Outlet /> {/* Child routes will render here */}
            </main>
            <footer style={{ textAlign: 'center', padding: '1rem', marginTop: 'auto', backgroundColor: '#f0f0f0' }}>
                <p>&copy; {new Date().getFullYear()} University MS. All rights reserved.</p>
            </footer>
        </>
    );
};

export default MainLayout; 