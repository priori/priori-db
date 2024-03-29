import { assert } from 'util/assert';
import { createRoot } from 'react-dom/client';
import AppWrapper from './AppWrapper';

const container = document.getElementById('root');
assert(container !== null);
createRoot(container).render(<AppWrapper />);
