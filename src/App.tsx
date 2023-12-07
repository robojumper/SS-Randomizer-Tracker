import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import FullAcknowledgement from './FullAcknowledgement';
import Shell from './Shell';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Shell />} />
                <Route path="/acknowledgement" element={<FullAcknowledgement />} />
            </Routes>
        </Router>
    );
}

export default App;
