- Editor
  - add/delete/edit programs (animations)
  - play/pause/reset
  - edit bpm
  - load/save project file
  
- Render
  - takes a program (animation) at a given tick and displays 3d render

- Video
 - takes a program (animation) at a given tick and displays 2d render



## Thoughts for architecture


### PlayerModule
Player module is the main module that the UI controls interaction with

Player module has 3 dependencies:
 - AudioPlayer
 - MidiPlayer
 - Animator 






_________
 |EDITOR|
-------------->-------->------|--------------------------|
                              |      PlayerMod           |
                              |       Midi               |
_________    |-------<-----<--|----- program (animation) |
 |RENDER|____|                          |   
---------                               |
                                        |
---------                               |
|VIDEO| --------<------<----------<-----|
---------