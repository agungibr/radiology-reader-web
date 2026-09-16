"""Generate fixtures/sample-chest-pa.dcm — fully synthetic, no PHI.

Chest PA adult, kVp 70 / 200 mA / 50 ms, 64x64 8-bit gradient.
Part-10 with file meta so dicom-parser accepts it.
"""

import os
import struct

HERE = os.path.dirname(os.path.abspath(__file__))


def elem(group, element, vr, value):
    out = struct.pack('<HH', group, element) + vr.encode('ascii')
    if isinstance(value, str):
        raw = value.encode('ascii')
        pad = b'\x00' if vr == 'UI' else b' '
        if len(raw) % 2 == 1:
            raw += pad
    elif isinstance(value, int):
        raw = struct.pack('<H', value)
    else:
        raw = bytes(value)
    if vr in ('OB', 'OW', 'OF', 'SQ', 'UC', 'UR', 'UT', 'UN'):
        out += b'\x00\x00' + struct.pack('<I', len(raw))
    else:
        out += struct.pack('<H', len(raw))
    return out + raw


W, H = 64, 64
pixels = bytes((x + y) % 256 for y in range(H) for x in range(W))

parts = [
    bytes(128),
    b'DICM',
    elem(0x0002, 0x0001, 'OB', [0, 1]),
    elem(0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.2'),
    elem(0x0002, 0x0003, 'UI', '1.2.826.0.1.99999.1'),
    elem(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1'),
    elem(0x0010, 0x0010, 'PN', 'Test^Pasien'),
    elem(0x0010, 0x0020, 'LO', 'TEST001'),
    elem(0x0010, 0x0030, 'DA', '19800101'),
    elem(0x0010, 0x0040, 'CS', 'M'),
    elem(0x0010, 0x1030, 'DS', '70'),
    elem(0x0008, 0x0020, 'DA', '20240101'),
    elem(0x0008, 0x0060, 'CS', 'CR'),
    elem(0x0008, 0x1030, 'LO', 'Chest PA'),
    elem(0x0018, 0x0015, 'CS', 'CHEST'),
    elem(0x0018, 0x5101, 'CS', 'PA'),
    elem(0x0018, 0x0060, 'DS', '70'),
    elem(0x0018, 0x1151, 'DS', '200'),
    elem(0x0018, 0x1150, 'DS', '50'),
    elem(0x0028, 0x0002, 'US', 1),
    elem(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
    elem(0x0028, 0x0010, 'US', H),
    elem(0x0028, 0x0011, 'US', W),
    elem(0x0028, 0x0100, 'US', 8),
    elem(0x0028, 0x0101, 'US', 8),
    elem(0x0028, 0x0102, 'US', 7),
    elem(0x0028, 0x0103, 'US', 0),
    elem(0x7FE0, 0x0010, 'OB', pixels),
]

path = os.path.join(HERE, 'sample-chest-pa.dcm')
with open(path, 'wb') as fh:
    for part in parts:
        fh.write(part)
print(f'{path} ({os.path.getsize(path)} bytes)')
