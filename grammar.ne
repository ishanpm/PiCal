main -> _ p              {% a => a[1] %}
      | _ p "//" [^\n]:* {% a => a[1] %} # Optionally end with a single line comment w/o newline

# Process
p -> i:*             {% id %}

# Instruction
i -> "+" _ n cc                  {% a => [a[0],a[2],a[3]] %} # Read
   | "!" _ n cc                  {% a => [a[0],a[2],a[3]] %} # Replicated read
   | "-" _ c cc                  {% a => [a[0],a[2],a[3]] %} # Write
   | "*" _ n cc                  {% a => [a[0],a[2],a[3]] %} # New channel / Alias
   | "(" _ p ")" _               {% a => [a[0],a[2]] %}      # Fork
   | "{" _ fprefix fargs:* "}" _ {% a => [a[0],a[2],a[3]] %} # Function shorthand
   | "<" sysname ">" _           {% a => [a[0],a[1]] %} # System directive

# Function shorthand
fprefix ->               c   {% a => [true, null,a[0]] %}
         |       c "|" _ c   {% a => [false,a[0],a[3]] %}
         | "*" _ n "|" _ c   {% a => [true, a[2],a[5]] %}
fargs   -> "+" _ n           {% a => [a[0],a[2]] %}
         | "-" _ c           {% a => [a[0],a[2]] %}

# Expression shorthand
eprefix -> null              {% a => null %}
         | n "|" _           {% a => a[0] %}
         
# Uneval. Expression shorthand
uprefix -> null                                  {% a => [null,null,[]  ] %}
         | ("*" _ n):? ("!" _ n):? fargs:* "|" _ {% a => [a[0],a[1],a[2]] %}

# Optional channel with colon
cc -> null                    {% a => null %}
    | ":" _ c1                {% a => a[2] %}

# Channel (rvalue)
c  -> null                    {% a => null %}
    | c1                      {% id %}
c1 -> number _                {% id %}
    | name _                  {% id %}
    | "["  _ eprefix p "]"  _ {% a => [a[0],a[2],a[3]] %} # Expression shorthand
    | "[[" _ uprefix p "]]" _ {% a => [a[0],a[2],a[3]] %} # Uneval. expression shorthand
# New channel (lvalue)
n  -> null                    {% a => null %}
    | n1                      {% id %}
n1 -> name _                  {% id %}

number   -> [0-9]:+                      {% a => +a[0] %}
name     -> namepart1 namepart:*         {% a => a[0]+a[1].join("") %}
namepart -> [0-9]                        {% id %}
          | namepart1                    {% id %}
namepart1-> [A-Za-z_#$.]                 {% id %}
          | "\"" [^"]:* "\""             {% a => a[0]+a[1].join("")+a[2] %}
          | "'" [^']:* "'"               {% a => a[0]+a[1].join("")+a[2] %}
_        -> [\s]:*                       {% a => null %}
          | [\s]:* comment _             {% a => null %}
          
sysname  -> [^>]:*                       {% a => a[0].join("") %}

comment -> "//" [^\n]:* "\n"
         | "/*" ( "/":* "*":* [^*/] ):* "/":* "*":* "*/"