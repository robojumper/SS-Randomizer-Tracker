import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import FullAcknowledgement from './FullAcknowledgement';
import Options from './Options';
import Tracker from './Tracker';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Options />} />
                <Route path="/tracker" element={<Tracker />} />
                <Route path="/acknowledgement" element={<FullAcknowledgement />} />
            </Routes>
        </Router>
    );
}

export default App;
