"""Generate a synthetic multi-series study (no PHI) for series/slice e2e.

One study (StudyUID 9.9.100) with two series:
- SeriesUID 9.9.101 ("AXIAL", SeriesNumber 1): 3 slices whose InstanceNumbers
  are deliberately shuffled across filenames (3, 1, 2) to prove numeric sort.
- SeriesUID 9.9.102 ("SCOUT", SeriesNumber 2): 3 slices in order.

Pixels are 32x32 gradients; content does not matter, only tags + order.
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


W, H = 32, 32

SERIES = [
    # (filename, series_uid, series_number, series_description, instance_number)
    ('ax-a.dcm', '9.9.101', '1', 'AXIAL', '3'),
    ('ax-b.dcm', '9.9.101', '1', 'AXIAL', '1'),
    ('ax-c.dcm', '9.9.101', '1', 'AXIAL', '2'),
    ('sc-1.dcm', '9.9.102', '2', 'SCOUT', '1'),
    ('sc-2.dcm', '9.9.102', '2', 'SCOUT', '2'),
    ('sc-3.dcm', '9.9.102', '2', 'SCOUT', '3'),
]

for name, series_uid, series_no, series_desc, inst in SERIES:
    pixels = bytes((x + y + int(inst) * 11) % 256 for y in range(H) for x in range(W))
    parts = [
        bytes(128),
        b'DICM',
        elem(0x0002, 0x0001, 'OB', [0, 1]),
        elem(0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.2'),
        elem(0x0002, 0x0003, 'UI', f'9.9.200.{inst}'),
        elem(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1'),
        elem(0x0010, 0x0010, 'PN', 'SERIES^TEST'),
        elem(0x0010, 0x0020, 'LO', 'SER001'),
        elem(0x0008, 0x0020, 'DA', '20240101'),
        elem(0x0008, 0x0060, 'CS', 'CT'),
        elem(0x0008, 0x1030, 'LO', 'CT ABDOMEN'),
        elem(0x0008, 0x103E, 'LO', series_desc),
        elem(0x0020, 0x000D, 'UI', '9.9.100'),
        elem(0x0020, 0x000E, 'UI', series_uid),
        elem(0x0008, 0x0018, 'UI', f'9.9.300.{series_no}.{inst}'),
        elem(0x0020, 0x0011, 'IS', series_no),
        elem(0x0020, 0x0013, 'IS', inst),
        elem(0x0018, 0x0015, 'CS', 'ABDOMEN'),
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
    path = os.path.join(HERE, 'series', name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as fh:
        for part in parts:
            fh.write(part)
print('series fixtures written to e2e/fixtures/series/')
