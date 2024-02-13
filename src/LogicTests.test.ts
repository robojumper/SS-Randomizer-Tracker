import { RemoteReference, loadRemoteLogic } from './loader/LogicLoader';
import { loadLogic } from './logic/slice';
import { defaultSettings } from './permalink/Settings';
import { AllTypedOptions } from './permalink/SettingsTypes';
import { RootState, Store, createStore } from './store/store';
import { areasSelector, checkSelector } from './tracker/selectors';
import { reset, setCheckHint } from './tracker/slice';

const main: RemoteReference = {
    type: 'forkBranch',
    author: 'ssrando',
    repoName: 'ssrando',
    branch: 'main',
}

describe('full logic tests', () => {
    let store: Store;
    let defaultSet: AllTypedOptions;

    beforeAll(async () => {
        store = createStore();
        const [logic, options] = await loadRemoteLogic(main);
        defaultSet = defaultSettings(options);
        store.dispatch(loadLogic({ logic, options, remote: main, remoteName: 'ssrando/main' }));
    });

    beforeEach(() => {
        store.dispatch(reset({ settings: defaultSet }))
    });

    function readSelector<T>(selector: (state: RootState) => T): T {
        return selector(store.getState());
    }

    function findCheckId(areaName: string, checkName: string) {
        const area = readSelector(areasSelector).find((a) => a.name.includes(areaName))!;
        expect(area).toBeDefined();
        const check = area.checks.find((c) => c.includes(checkName))!;
        expect(check).toBeDefined();
        return check;
    }

    it('has some checks in logic with default settings', () => {
        const fledgeCheck = readSelector(checkSelector(findCheckId('Upper Skyloft', 'Fledge\'s Gift')));
        expect(fledgeCheck.logicalState).toBe('inLogic');
    });

    it('supports hint item semilogic', () => {
        const fledgesGiftId = findCheckId('Upper Skyloft', 'Fledge\'s Gift');
        const zeldaClosetGift = findCheckId('Upper Skyloft', 'Zelda\'s Closet');

        // Zelda's Closet is out of logic because it needs clawshots
        const closetCheck = readSelector(checkSelector(zeldaClosetGift));
        expect(closetCheck.logicalState).toBe('outLogic');

        // But if Fledge's Gift is hinted to be Clawshots...
        store.dispatch(setCheckHint({ checkId: fledgesGiftId, hint: 'Clawshots' }));

        // Then Zelda's Closet is semilogic
        const newClosetCheck = readSelector(checkSelector(zeldaClosetGift));
        expect(newClosetCheck.logicalState).toBe('semiLogic');
    });
});
