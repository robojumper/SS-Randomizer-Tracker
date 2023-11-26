import '../App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Shell from './Shell';

function NewApp() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Shell />} />
            </Routes>
        </Router>
    );
}

export default NewApp;
