### Clip Follower

Various Max sequencers tend to run as long as the clock is running.  This device is meant make them respond to clip launch/stop events.
This allows tracks with note generators to controlled much like regular clips.  The supported options are:

1) Always -- (e.g. same as disableing the device), just let the input devices do what they do.
2) Playing -- Swallow notes if there is no clip playing on the current track, pass through notes if there is a a clip playing.
3) Starred -- Only play if the name of the currently playing clip starts with "*"

*known problem*
This device seems to break after the Max4Live editor is opened??? But why???
