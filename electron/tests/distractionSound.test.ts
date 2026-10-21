// Run from electron/: node --test tests/distractionSound.test.ts
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { scheduleDistractionSound } from '../src/renderer/lib/distractionSound.ts'

function createAudio() {
  return {
    loop: false,
    currentTime: 0,
    play: mock.fn(async () => {}),
    pause: mock.fn(() => {}),
  }
}

test('a sustained distraction starts looping after ten seconds', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const audio = createAudio()
  const stop = scheduleDistractionSound(audio, 10_000)

  t.mock.timers.tick(9_999)
  assert.equal(audio.play.mock.callCount(), 0)
  t.mock.timers.tick(1)
  assert.equal(audio.play.mock.callCount(), 1)
  assert.equal(audio.loop, true)
  t.mock.timers.tick(30_000)
  assert.equal(audio.play.mock.callCount(), 1, 'the audio loops without repeated play calls')
  stop()
})

test('recovery before ten seconds cancels the pending alert', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const audio = createAudio()
  const stop = scheduleDistractionSound(audio, 10_000)

  t.mock.timers.tick(9_000)
  stop()
  t.mock.timers.tick(30_000)
  assert.equal(audio.play.mock.callCount(), 0)
})

test('the countdown reaches zero on the same timer that starts playback', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const audio = createAudio()
  const countdown: number[] = []
  const stop = scheduleDistractionSound(audio, 10_000, (seconds) => countdown.push(seconds))

  for (let seconds = 9; seconds >= 1; seconds -= 1) {
    t.mock.timers.tick(1000)
    assert.equal(countdown.at(-1), seconds)
    assert.equal(audio.play.mock.callCount(), 0)
  }
  t.mock.timers.tick(1000)
  assert.deepEqual(countdown, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
  assert.equal(audio.play.mock.callCount(), 1)
  t.mock.timers.tick(20_000)
  assert.equal(countdown.length, 10, 'the countdown stops updating at zero')
  stop()
})

test('recovery also cancels countdown updates', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const audio = createAudio()
  const countdown: number[] = []
  const stop = scheduleDistractionSound(audio, 10_000, (seconds) => countdown.push(seconds))

  t.mock.timers.tick(1000)
  stop()
  t.mock.timers.tick(20_000)
  assert.deepEqual(countdown, [9])
  assert.equal(audio.play.mock.callCount(), 0)
})

test('recovery, pause, stop, or unmount stops and rewinds playback immediately', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const audio = createAudio()
  const stop = scheduleDistractionSound(audio, 10_000)
  t.mock.timers.tick(10_000)
  audio.currentTime = 1.5

  stop()
  assert.equal(audio.pause.mock.callCount(), 1)
  assert.equal(audio.currentTime, 0)
})

test('a subsequent distraction waits a full ten seconds and starts at zero', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const audio = createAudio()
  const stopFirst = scheduleDistractionSound(audio, 10_000)
  t.mock.timers.tick(12_000)
  audio.currentTime = 1.5
  stopFirst()

  const stopNext = scheduleDistractionSound(audio, 10_000)
  t.mock.timers.tick(9_999)
  assert.equal(audio.play.mock.callCount(), 1)
  t.mock.timers.tick(1)
  assert.equal(audio.play.mock.callCount(), 2)
  assert.equal(audio.currentTime, 0)
  stopNext()
})

test('playback failures are reported without an unhandled rejection', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const log = t.mock.method(console, 'error', () => {})
  const error = new Error('Playback unavailable')
  const audio = { ...createAudio(), play: async () => { throw error } }
  const stop = scheduleDistractionSound(audio, 10_000)

  t.mock.timers.tick(10_000)
  await Promise.resolve()
  assert.equal(log.mock.callCount(), 1)
  assert.equal(log.mock.calls[0].arguments[1], error)
  stop()
})

test('a pending play rejection after cleanup is handled quietly', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const log = t.mock.method(console, 'error', () => {})
  const audio = {
    ...createAudio(),
    play: async () => { throw new Error('Playback interrupted by pause') },
  }
  const stop = scheduleDistractionSound(audio, 10_000)

  t.mock.timers.tick(10_000)
  stop()
  await Promise.resolve()
  assert.equal(log.mock.callCount(), 0)
})
