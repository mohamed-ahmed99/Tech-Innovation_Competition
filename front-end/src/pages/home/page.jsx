import React from 'react'
import { useGlobalData } from '../../context/GlobalContext';

const HomePage = () => {
    const [store, setGlobalData] = useGlobalData();
    return (
        <div>HomePage</div>
    )
}

export default HomePage;