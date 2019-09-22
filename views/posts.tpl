{% extends main.tpl %}

{% block title %}Posts{% endblock %}

{% block content %}
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
{% endblock %}
