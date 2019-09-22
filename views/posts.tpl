{% extends main.tpl %}

{% block title %}Posts{% endblock %}

{% block head %}
  <script src="/posts.js"></script>
{% endblock %}

{% block content %}
  <p>Last updated: {%= lastUpdated %}</p>

  <h1>Posts<h1>
  {% for post in posts %}
    {% render _post.tpl %}
  {% end %}
{% endblock %}
