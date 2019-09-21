<html>

Hello there.

{%= price %}
{%= names %}

<ul>
{% for name in names %}
  <li>
    hi there
    {%= name %}
    blah

    {% for item in items %}
      {%= name %} and {%= item %}
    {% end %}
  </li>
{% end %}
</ul>

</html>