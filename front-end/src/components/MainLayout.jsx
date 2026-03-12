import { Outlet, Navigate } from 'react-router-dom';
import { useGlobalData } from '../hooks/useGlobalData';
import Navbar from './Navbar';

export default function MainLayout() {
    const [user] = useGlobalData('user');



    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
            <Navbar isUserAuthenticated={user ? true : false} />
            <main className="">
                <Outlet />
            </main>
        </div>
    );
}
