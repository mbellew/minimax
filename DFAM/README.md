### DFAM

Inspired by Moog DFAM obviously.  This device features three rows of eight knobs.  Each row can be mapped to a control in a device on the same track.
Each row represents an eight step sequencer that changes a control value with each step.  By default the DFAM controls pitch and velocity, but MIDI notes
are pretty good at that, so this focuses on the CV like functionaly.

NOTE : The sequencer is driven by the global transport, and may _not_ be synched with incoming notes.  DFAM tries to send its control changes a _little_ bit early so they
are in place before any incoming note playing on the same timeslot.  Right now I have a knob in the bottom left that allows for fiddling with the lead time.
