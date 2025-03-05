import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import { AppRegistry } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

const PLAYER_SIZE = 30; // Triangle base width and height
const ALIEN_WIDTH = 30;
const ALIEN_HEIGHT = 20;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const ALIEN_ROWS = 2;
const ALIEN_COLS = 5;
const ALIEN_SPEED = 2;
const BULLET_SPEED = 5;
const EXPLOSION_DURATION = 500; // milliseconds

const SpaceInvaders = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [entities, setEntities] = useState(null);

  useEffect(() => {
    const player = {
      position: [WINDOW_WIDTH / 2 - PLAYER_SIZE / 2, WINDOW_HEIGHT - 50],
      size: [PLAYER_SIZE, PLAYER_SIZE],
      renderer: Player,
    };

    const aliens = [];
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        aliens.push({
          position: [col * (ALIEN_WIDTH + 10) + 50, row * (ALIEN_HEIGHT + 10) + 50],
          size: [ALIEN_WIDTH, ALIEN_HEIGHT],
          renderer: Alien,
          direction: 1, // 1 for right, -1 for left
        });
      }
    }

    setEntities({
      1: player,
      ...aliens.reduce((acc, alien, idx) => ({ ...acc, [idx + 2]: alien }), {}),
    });
  }, []);

  const Systems = {
    MovePlayer: (entities, { touches }) => {
      if (!entities[1]) return entities;
      const player = entities[1];
      touches.filter(t => t.type === 'move').forEach(t => {
        const newX = t.event.pageX - PLAYER_SIZE / 2; // Center on finger
        player.position[0] = Math.max(0, Math.min(WINDOW_WIDTH - PLAYER_SIZE, newX));
      });
      return entities;
    },
    MoveAliens: (entities, { time }) => {
      let edgeHit = false;
      for (let id in entities) {
        if (id !== '1' && entities[id]?.renderer === Alien) {
          const alien = entities[id];
          alien.position[0] += alien.direction * ALIEN_SPEED;
          if (alien.position[0] + ALIEN_WIDTH >= WINDOW_WIDTH || alien.position[0] <= 0) {
            edgeHit = true;
          }
        }
      }
      if (edgeHit) {
        for (let id in entities) {
          if (id !== '1' && entities[id]?.renderer === Alien) {
            const alien = entities[id];
            alien.position[1] += 10; // Drop down
            alien.direction *= -1; // Reverse direction
          }
        }
      }
      for (let id in entities) {
        if (id !== '1' && entities[id]?.renderer === Alien) {
          if (entities[id].position[1] + ALIEN_HEIGHT >= WINDOW_HEIGHT) {
            setGameOver(true);
          }
        }
      }
      return entities;
    },
    Shoot: (entities, { touches }) => {
      if (!entities[1]) return entities;
      const player = entities[1];
      touches.filter(t => t.type === 'press').forEach(t => {
        const bulletId = Math.max(...Object.keys(entities).map(Number), 0) + 1;
        entities[bulletId] = {
          position: [player.position[0] + PLAYER_SIZE / 2 - BULLET_WIDTH / 2, player.position[1] - BULLET_HEIGHT],
          size: [BULLET_WIDTH, BULLET_HEIGHT],
          renderer: Bullet,
        };
      });
      return entities;
    },
    MoveBullets: (entities) => {
      for (let id in entities) {
        if (entities[id]?.renderer === Bullet) {
          entities[id].position[1] -= BULLET_SPEED;
          if (entities[id].position[1] < 0) delete entities[id];
        }
      }
      return entities;
    },
    CheckCollisions: (entities) => {
      for (let bulletId in entities) {
        if (entities[bulletId]?.renderer === Bullet) {
          for (let alienId in entities) {
            if (entities[alienId]?.renderer === Alien) {
              const bullet = entities[bulletId];
              const alien = entities[alienId];
              if (
                bullet.position[0] < alien.position[0] + ALIEN_WIDTH &&
                bullet.position[0] + BULLET_WIDTH > alien.position[0] &&
                bullet.position[1] < alien.position[1] + ALIEN_HEIGHT &&
                bullet.position[1] + BULLET_HEIGHT > alien.position[1]
              ) {
                // Replace alien with explosion
                const explosionId = alienId;
                entities[explosionId] = {
                  position: [alien.position[0], alien.position[1]],
                  size: [ALIEN_WIDTH, ALIEN_HEIGHT],
                  renderer: Explosion,
                  timeout: Date.now() + EXPLOSION_DURATION,
                };
                delete entities[bulletId];
                setScore(s => s + 1);
              }
            }
          }
        }
      }
      // Remove expired explosions
      for (let id in entities) {
        if (entities[id]?.renderer === Explosion && Date.now() > entities[id].timeout) {
          delete entities[id];
        }
      }
      if (Object.keys(entities).filter(id => entities[id]?.renderer === Alien).length === 0 && entities[1]) {
        setGameOver(true); // Win condition
      }
      return entities;
    },
  };

  const Player = ({ position, size }) => (
    <Text style={[styles.entity, { left: position[0], top: position[1], width: size[0], height: size[1], color: 'white', fontSize: PLAYER_SIZE, textAlign: 'center' }]}>
      ▲
    </Text>
  );

  const Alien = ({ position, size }) => (
    <View style={[styles.entity, { left: position[0], top: position[1], width: size[0], height: size[1], backgroundColor: 'red' }]} />
  );

  const Bullet = ({ position, size }) => (
    <View style={[styles.entity, { left: position[0], top: position[1], width: size[0], height: size[1], backgroundColor: 'yellow' }]} />
  );

  const Explosion = ({ position, size }) => (
    <View style={[styles.entity, { left: position[0], top: position[1], width: size[0], height: size[1] }]}>
      {Array(8).fill().map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: Math.random() * size[0],
            top: Math.random() * size[1],
            width: 4,
            height: 4,
            backgroundColor: ['red', 'yellow', 'white'][Math.floor(Math.random() * 3)],
          }}
        />
      ))}
    </View>
  );

  if (gameOver) {
    return (
      <View style={styles.container}>
        <Text style={styles.gameOver}>Game Over! Score: {score}</Text>
        <TouchableOpacity onPress={() => { setGameOver(false); setScore(0); setEntities(null); }}>
          <Text style={styles.restart}>Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!entities) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.score}>Score: {score}</Text>
      <GameEngine
        style={styles.gameContainer}
        systems={[Systems.MovePlayer, Systems.MoveAliens, Systems.Shoot, Systems.MoveBullets, Systems.CheckCollisions]}
        entities={entities}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  gameContainer: { flex: 1 },
  entity: { position: 'absolute' },
  score: { color: 'white', fontSize: 20, textAlign: 'center', marginTop: 20 },
  gameOver: { color: 'white', fontSize: 30, textAlign: 'center', marginTop: WINDOW_HEIGHT / 2 - 50 },
  restart: { color: 'white', fontSize: 20, textAlign: 'center', marginTop: 20 },
  loading: { color: 'white', fontSize: 20, textAlign: 'center', marginTop: WINDOW_HEIGHT / 2 },
});

AppRegistry.registerComponent('main', () => SpaceInvaders);

export default SpaceInvaders;