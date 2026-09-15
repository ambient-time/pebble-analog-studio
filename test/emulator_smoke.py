"""Native emulator evidence, without wiping state or changing any physical watch.

Run with pebble-tool's Python; requires an already built PBW. Uses tool 5.0.x
screenshot internals. The output lives in build/evidence, never store assets.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import time
from uuid import UUID

SDK = Path.home() / 'Library/Application Support/Pebble SDK/SDKs/current'
toolchain = str(SDK.resolve() / 'toolchain/bin')
os.environ.setdefault('PEBBLE_QEMU_PATH', toolchain + '/qemu-pebble')
os.environ['PATH'] = toolchain + os.pathsep + os.environ['PATH']
import png
from pebble_tool.commands.screenshot import ScreenshotCommand
from pebble_tool.commands.install import ToolAppInstaller
from libpebble2.services.appmessage import AppMessageService, CString
from libpebble2.protocol.apps import AppRunState, AppRunStateStop, AppRunStateStart
from libpebble2.protocol.logs import AppLogMessage, AppLogShippingControl
from pebble_tool.commands.emucontrol import send_data_to_qemu
from libpebble2.communication.transports.qemu.protocol import QemuButton
import pebble_tool.sdk.emulator as emulator

ROOT = Path(__file__).resolve().parent.parent
APP = UUID('f580e82c-3699-4a54-8c00-1c1306921db5')

def run(platform):
    out = ROOT / 'build/evidence'
    out.mkdir(exist_ok=True)
    # A private profile avoids unrelated apps' stale crash modals and preserves
    # every existing developer emulator. Keep this profile across test runs.
    state = ROOT / 'build/emulator-state'
    state.mkdir(exist_ok=True)
    def persist_dir(target, version=None):
        path = state / target
        path.mkdir(exist_ok=True)
        return str(path)
    emulator.get_sdk_persist_dir = persist_dir
    emulator.get_emulator_info_path = lambda: str(state / 'emulators.json')
    command = ScreenshotCommand()
    command._set_debugging(0)
    pebble = command._connect_emulator(platform, None)
    command.pebble = pebble
    service = AppMessageService(pebble)
    log_lines = []
    def log(packet):
        log_lines.append(str(packet.message))
        print(str(packet.message), flush=True)
    log_handle = pebble.register_endpoint(AppLogMessage, log)
    pebble.send_packet(AppLogShippingControl(enable=True))
    frames = []
    args = argparse.Namespace(no_correction=True, scale=1, no_open=True, v=0)
    target = datetime.datetime.now().replace(hour=10, minute=10, second=20, microsecond=0)
    def grab(name, set_clock=True):
        if set_clock:
            command._set_time(pebble, target)
        time.sleep(0.5)
        frame = command._grab_processed_image(args, show_progress=False)
        filename = out / (platform + '-' + name + '.png')
        png.from_array(frame, mode='RGBA;8').save(str(filename))
        frames.append(str(filename.relative_to(ROOT)))
        return frame
    def send(code):
        # Time changes alone need not trigger a minute-only app immediately.
        # Set the fixture first; settings delivery then schedules a fresh draw.
        command._set_time(pebble, target)
        time.sleep(0.2)
        service.send_message(APP, {10000: CString(code)})
        time.sleep(0.5)
    try:
        time.sleep(4)
        # Dismiss a previously crashed app's modal without wiping its data.
        send_data_to_qemu(pebble.transport, QemuButton(state=QemuButton.Button.Back))
        time.sleep(0.1)
        send_data_to_qemu(pebble.transport, QemuButton(state=0))
        time.sleep(0.5)
        ToolAppInstaller(pebble, str(ROOT / 'build' / (ROOT.name + '.pbw')), quiet=True).install()
        time.sleep(2)
        pebble.send_packet(AppRunState(data=AppRunStateStart(uuid=APP)))
        time.sleep(1)
        recipe_frames = []
        for name, code in [('ivory','L1:1:1:1:0:0:0:0:0'),('frost','L1:2:2:2:0:0:0:0:0'),('noir','L1:3:3:3:0:0:0:0:0')]:
            send(code)
            recipe_frames.append(grab(name))
        assert recipe_frames[0] != recipe_frames[1] and recipe_frames[1] != recipe_frames[2], 'Recipe changes were not visible (wrong app or modal overlay)'
        mixed_frames = []
        for name, code in [('copper-verdigris','L1:1:4:4:0:0:0:0:0'),('blued-ocean','L1:2:5:5:0:0:0:0:0'),('verdigris-rosewood','L1:3:6:6:0:0:0:0:0')]:
            send(code)
            mixed_frames.append(grab(name))
        if platform != 'diorite':
            assert mixed_frames[0] != mixed_frames[1] and mixed_frames[1] != mixed_frames[2], 'Expanded materials were not visible'
        send('L1:2:6:4:2:2:1:0:1')
        before = grab('custom')
        send('L1:1:7:1:0:0:0:0:0')
        invalid = grab('invalid-rejected')
        assert before == invalid, 'Malformed code changed the display'
        pebble.send_packet(AppRunState(data=AppRunStateStop(uuid=APP)))
        time.sleep(1)
        pebble.send_packet(AppRunState(data=AppRunStateStart(uuid=APP)))
        time.sleep(2)
        restored = grab('restart-retained')
        assert before == restored, 'Restart did not preserve configured design'
        send('L1:2:6:4:2:2:1:1:1')
        first_second = grab('seconds-start')
        time.sleep(2.2)
        later_second = grab('seconds-later', set_clock=False)
        assert first_second != later_second, 'Enabled seconds did not advance visibly'
        report = {'platform':platform,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'pbwSHA256':hashlib.sha256((ROOT/'build'/(ROOT.name + '.pbw')).read_bytes()).hexdigest(),
                  'materialExpansion':'Six bezels/six dials; legacy artwork IDs1–27 retained',
                  'invalidCodeUnchanged':True,'restartRetained':True,'secondsAdvance':True,'frames':frames,'logs':log_lines,
                  'limits':'Private persistent emulator profile; direct AppMessage, not physical phone webview evidence.'}
        (out / (platform + '-report.json')).write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2))
    finally:
        service.shutdown()
        pebble.unregister_endpoint(log_handle)
        command._close_pebble_connection(pebble)
        command.pebble = None
        command._shutdown_platform_emulator(platform, None)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('platform', choices=['emery','diorite','chalk','gabbro'])
    run(parser.parse_args().platform)
