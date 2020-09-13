# PiCal

An unfinished esoteric programming language based around Pi Calculus.

Features:
- A pseudo-bytecode-based interpreter
- ~~If statements~~ Ternary statements
- Lots of threads
- Lots of brackets and braces

This is a work in progress, so there are several bugs, and the process viewer is rather ugly. The language specification is still subject to change as well, particularly edge cases about the shorthand operators.

## The language

PiCal programs consist of a sequence of these commands:

| Command | Name | Function |
|-|-|-|
|`+x:c`      |Read     | Wait until c has data, then read x from c      |
|`!x:c`      |Replicate| Infinitely read x from c, creating new threads |
|`*x`        |New      | Create a new channel x                         |
|`-x:c`      |Write    | Write x to c and wait until it is read         |
|`(P)`       |Fork     | Run P on a new thread                          |
|`*x:y`      |Alias    | Alias y as x                                   |
|`{f -i +o}` |Function call shorthand |Short for `*io -:f -i:io +o:io`       |
|`//` `/* */`|Comment  |Does nothing (treated as whitespace)            |

The only data type is channels, which can be read from and written to. Channel names can contain any character matched by `[A-Za-z_#$]`, in addition to sequences of characters enclosed by single or double quotes, but they must not begin with a number.

These expressions can be used as input to a command:

|Expression|Function|
|-|-|
|*name*                  |Channel name                                                                 |
|*number*                |*n*th most recently created channel, 0 is most recent                       |
|`[P]`                   |Expression shorthand: Evaluates process and returns last created channel     |
|`[x\|P]`                |Expression shorthand: Evaluates process and returns channel named x          |
|`[[P]]`                 |Unevaluated shorthand: `[*(!r P -:r)]`                                       |
|`[[*self !io +i -o\|P]]`|Unevaluated w/ signature: `[*self(!io +i:r P -o:r)]`                         |

Reads and writes are blocking, so they can be used to implement mutexes, semaphores, joins, and many more operators normally regarded as primitive.

## The interpreter

Since a program may create hundreds of threads and channels during its execution, the interpreter keeps a reference count for every channel. Any process waiting on a channel which has lost all other references is halted and discarded. This reference count is still quite buggy and misses some deadlocks; this will be improved in a later version.