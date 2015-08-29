import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mochawait';
import ADB from '../../lib/adb.js';
import { withMocks } from '../helpers';

chai.use(chaiAsPromised);
const should = chai.should(),
      pkg = 'com.example.android.contactmanager',
      act = '.ContactManager',
      startAppOptions = {stopApp: true, action: 'action', category: 'cat',
                         flags: 'flags', pkg: 'pkg', activity: 'act',
                         optionalIntentArguments: '-x options'},
      cmd = ['am', 'start', '-n', 'pkg/act', '-S', '-a', 'action', '-c', 'cat',
             '-f', 'flags', '-x options'];

describe('Apk-utils', () => {
  let adb = new ADB();
  describe('isAppInstalled', withMocks({adb}, (mocks) => {
    it('should parse correctly and return true', async () => {
      const pkg = 'dummy.package';
      mocks.adb.expects('getApiLevel')
        .once().withExactArgs()
        .returns("17");
      mocks.adb.expects('shell')
        .once().withExactArgs(['pm', 'list', 'packages', '-3', pkg])
        .returns(`package:${pkg}`);
      (await adb.isAppInstalled(pkg)).should.be.true;
      mocks.adb.verify();
    });
    it('should parse correctly and return false', async () => {
      const pkg = 'dummy.package';
      mocks.adb.expects('getApiLevel')
        .once().withExactArgs()
        .returns("17");
      mocks.adb.expects('shell')
        .once().withExactArgs(['pm', 'list', 'packages', '-3', pkg])
        .returns("");
      (await adb.isAppInstalled(pkg)).should.be.false;
      mocks.adb.verify();
    });
  }));
  describe('getFocusedPackageAndActivity', withMocks({adb}, (mocks) => {
    it('should parse correctly and return package and activity', async () => {
      mocks.adb.expects('shell')
        .once().withExactArgs(['dumpsys', 'window', 'windows'])
        .returns(`mFocusedApp=AppWindowToken{38600b56 token=Token{9ea1171 ` +
                 `ActivityRecord{2 u ${pkg}/${act} t181}}}`);

      let {appPackage, appActivity} = await adb.getFocusedPackageAndActivity();
      appPackage.should.equal(pkg);
      appActivity.should.equal(act);
      mocks.adb.verify();
    });
    it('should parse correctly and return null', async () => {
      mocks.adb.expects('shell')
        .once().withExactArgs(['dumpsys', 'window', 'windows'])
        .returns('mFocusedApp=null');
      should.not.exist(await adb.getFocusedPackageAndActivity());
      mocks.adb.verify();
    });
  }));
  describe('waitForActivityOrNot', withMocks({adb}, (mocks) => {
    it('should call shell once and should return', async () => {
      mocks.adb.expects('shell')
        .once().withExactArgs(['dumpsys', 'window', 'windows'])
        .returns(`mFocusedApp=AppWindowToken{38600b56 token=Token{9ea1171 ` +
                 `ActivityRecord{2 u ${pkg}/${act} t181}}}`);

      await adb.waitForActivityOrNot(pkg, act, false);
      mocks.adb.verify();
    });
    it('should call shell multiple times and return', async () => {
      mocks.adb.expects('shell').onCall(0)
        .returns('mFocusedApp=AppWindowToken{38600b56 token=Token{9ea1171 ' +
                 'ActivityRecord{2c7c4318 u0 foo/bar t181}}}');
      mocks.adb.expects('shell')
        .returns('mFocusedApp=AppWindowToken{38600b56 token=Token{9ea1171 ' +
                 'ActivityRecord{2c7c4318 u0 com.example.android.contactmanager/.ContactManager t181}}}');

      await adb.waitForActivityOrNot(pkg, act, false);
      mocks.adb.verify();
    });
    it('should call shell once return for not', async () => {
      mocks.adb.expects('shell')
        .once().withExactArgs(['dumpsys', 'window', 'windows'])
        .returns('mFocusedApp=AppWindowToken{38600b56 token=Token{9ea1171 ' +
                 'ActivityRecord{c 0 foo/bar t181}}}');

      await adb.waitForActivityOrNot(pkg, act, true);
      mocks.adb.verify();
    });
    it('should call shell multiple times and return for not', async () => {
      mocks.adb.expects('shell').onCall(0)
        .returns(`mFocusedApp=AppWindowToken{38600b56 token=Token{9ea1171 ` +
                 `ActivityRecord{2 u ${pkg}/${act} t181}}}`);
      mocks.adb.expects('shell')
        .returns('mFocusedApp=AppWindowToken{38600b56 token=Token{9ea1171 ' +
                 'ActivityRecord{2c7c4318 u0 foo/bar t181}}}');
      await adb.waitForActivityOrNot(pkg, act, true);
      mocks.adb.verify();
    });
  }));
  describe('waitForActivity', withMocks({adb}, (mocks) => {
    it('should call waitForActivityOrNot with correct arguments', async () => {
      mocks.adb.expects('waitForActivityOrNot')
        .once().withExactArgs(pkg, act, false, 20000)
        .returns('');
      await adb.waitForActivity(pkg, act);
      mocks.adb.verify();
    });
  }));
  describe('waitForNotActivity', withMocks({adb}, (mocks) => {
    it('should call waitForActivityOrNot with correct arguments', async () => {
      mocks.adb.expects('waitForActivityOrNot')
        .once().withExactArgs(pkg, act, true, 20000)
        .returns('');
      await adb.waitForNotActivity(pkg, act);
      mocks.adb.verify();
    });
  }));
  describe('uninstallApk', withMocks({adb}, (mocks) => {
    it('should call forceStop and adbExec with correct arguments', async () => {
      mocks.adb.expects('forceStop')
        .once().withExactArgs(pkg)
        .returns('');
      mocks.adb.expects('adbExec')
        .once().withExactArgs(['uninstall', pkg], {timeout: 20000})
        .returns('Success');
      (await adb.uninstallApk(pkg)).should.be.true;
      mocks.adb.verify();
    });
  }));
  describe('installFromDevicePath', withMocks({adb}, (mocks) => {
    it('should call forceStop and adbExec with correct arguments', async () => {
      mocks.adb.expects('shell')
        .once().withExactArgs(['pm', 'install', '-r', 'foo'])
        .returns('');
      (await adb.installFromDevicePath('foo'));
      mocks.adb.verify();
    });
  }));
  describe('install', withMocks({adb}, (mocks) => {
    it('should call forceStop and adbExec with correct arguments', async () => {
      mocks.adb.expects('adbExec')
        .once().withExactArgs(['install', '-r', 'foo'], {timeout: 60000})
        .returns('');
      (await adb.install('foo'));
      mocks.adb.verify();
    });
  }));
  describe('startApp', withMocks({adb}, (mocks) => {
    it('should call getApiLevel and shell with correct arguments', async () => {
      mocks.adb.expects('getApiLevel')
        .once().withExactArgs()
        .returns('17');
      mocks.adb.expects('shell')
        .once().withExactArgs(cmd)
        .returns('');
      (await adb.startApp(startAppOptions));
      mocks.adb.verify();
    });
    it('should call getApiLevel and shell with correct arguments', async () => {
      mocks.adb.expects('getApiLevel')
        .twice()
        .returns('17');
      mocks.adb.expects('shell')
        .onCall(0)
        .returns('Error: Activity class foo does not exist');
      mocks.adb.expects('shell')
        .returns('');
      (await adb.startApp(startAppOptions));
      mocks.adb.verify();
    });
  }));
});
