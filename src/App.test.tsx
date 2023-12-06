import { render } from '@testing-library/react';
import Shell from './Shell';
import { Provider } from 'react-redux';
import { store } from './store/store';

test('renders loading page', () => {
    const { getByText } = render(
        <Provider store={store}>
            <Shell />
        </Provider>,
    );
    const linkElement = getByText(/Loading.../);
    expect(linkElement).toBeInTheDocument();
});
