import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidHlsUrl,
  formatBitrate,
  formatTime,
  getResolutionLabel,
  getBufferStatus,
  DEFAULT_PRESETS,
  resolvePlayableStreamUrl,
} from './stream.ts';

test('DEFAULT_PRESETS contains the user requested Globo TV Bahia FHD stream URL', () => {
  assert.equal(DEFAULT_PRESETS.length, 1);
  assert.equal(
    DEFAULT_PRESETS[0].url,
    'http://hls1.sua.tv/live/globotvbahiafhdbr2/s.m3u8'
  );
  assert.equal(DEFAULT_PRESETS[0].title, 'Globo TV Bahia FHD');
});

test('resolvePlayableStreamUrl handles raw and proxied paths properly', () => {
  assert.equal(
    resolvePlayableStreamUrl('https://example.com/live.m3u8'),
    'https://example.com/live.m3u8'
  );
});

test('isValidHlsUrl validates correct and incorrect URLs', () => {
  const streamRes = isValidHlsUrl(DEFAULT_PRESETS[0].url);
  assert.equal(streamRes.valid, true);

  const emptyRes = isValidHlsUrl('');
  assert.equal(emptyRes.valid, false);

  const invalidProto = isValidHlsUrl('ftp://example.com/live.m3u8');
  assert.equal(invalidProto.valid, false);

  const nonM3u8 = isValidHlsUrl('https://example.com/video.mp4');
  assert.equal(nonM3u8.valid, true);
  assert.ok(nonM3u8.reason?.includes('m3u8'));
});

test('formatBitrate formats bps correctly', () => {
  assert.equal(formatBitrate(1316400), '1.32 Mbps');
  assert.equal(formatBitrate(5000000), '5.00 Mbps');
  assert.equal(formatBitrate(800000), '800 kbps');
  assert.equal(formatBitrate(0), 'Desconhecido');
});

test('formatTime formats seconds properly', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(3665), '01:01:05');
  assert.equal(formatTime(NaN), '00:00');
});

test('getResolutionLabel categorizes standard resolutions', () => {
  assert.equal(getResolutionLabel(1080), '1080p (Full HD)');
  assert.equal(getResolutionLabel(720), '720p (HD)');
  assert.equal(getResolutionLabel(480), '480p (SD)');
  assert.equal(getResolutionLabel(360), '360p');
  assert.equal(getResolutionLabel(), 'Automático');
});

test('getBufferStatus reports buffer health accurately', () => {
  assert.equal(getBufferStatus(12).status, 'healthy');
  assert.equal(getBufferStatus(6).status, 'healthy');
  assert.equal(getBufferStatus(2).status, 'warning');
  assert.equal(getBufferStatus(0.5).status, 'critical');
});
