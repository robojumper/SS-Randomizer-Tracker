import { render } from '@testing-library/react';
import TrackerContainer from './Tracker';
import { Provider } from 'react-redux';
import { store } from './store/store';

test('renders loading page', () => {
    const { getByText } = render(
        <Provider store={store}>
            <TrackerContainer />
        </Provider>,
    );
    const linkElement = getByText(/Loading.../);
    expect(linkElement).toBeInTheDocument();
});
