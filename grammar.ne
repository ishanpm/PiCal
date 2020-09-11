main -> _ p              {% a => a[1] %}
      | _ p "//" [^\n]:* {% a => a[1] %} # Optionally end with a single line comment

# Process
p -> i:*             {% id %}

# Instruction
i -> "+" _ c cn      {% a => [a[0],a[2],a[3]] %} # Read
   | "!" _ c cn      {% a => [a[0],a[2],a[3]] %} # Replicated read
   | "-" _ c cc      {% a => [a[0],a[2],a[3]] %} # Write
   | "*" _ n         {% a => [a[0],a[2]] %}      # New channel
   | "(" _ p ")" _   {% a => [a[0],a[2]] %}      # Fork
   | "{" _ c a "}" _ {% a => [a[0],a[2],a[3]] %} # Function shorthand

# Function argument
a -> null
   | "+" _ n a       {% a => [[a[0],a[2]]].concat(a[3]) %}
   | "-" _ c a       {% a => [[a[0],a[2]]].concat(a[3]) %}

# Channel with colon
cc -> null           {% a => 0 %}
    | ":" _ c1       {% a => a[2] %}
# New channel with colon
cn -> null           {% a => null %}
    | ":" _ n1       {% a => a[2] %}

# Channel
c  -> null            {% a => 0 %}
    | c1              {% id %}
c1 -> number _        {% id %}
    | name _          {% id %}
    | "<" _ p ">" _   {% a => a[2] %} # Expression shorthand
# New channel
n  -> null            {% a => null %}
    | n1              {% id %}
n1 -> name _          {% id %}

number   -> [0-9]:+                      {% a => +a[0] %}
name     -> namepart1 namepart:*         {% a => a[0]+a[1].join("") %}
namepart -> [0-9]                        {% id %}
          | namepart1                    {% id %}
namepart1-> [A-Za-z_#$.]                 {% id %}
          | "\"" [^"]:* "\""             {% a => a[0]+a[1].join("")+a[2] %}
          | "'" [^']:* "'"               {% a => a[0]+a[1].join("")+a[2] %}
_        -> [\s]:*                       {% a => null %}
          | [\s]:* comment _             {% a => null %}

comment -> "//" [^\n]:* "\n"
         | "/*" cblock "*/"
cblock  -> null
         | [^*] cblock
         | "*"
         | "*" [^/] cblock